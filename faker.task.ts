import { faker } from '@faker-js/faker';
import { AppDataSource, ensureDatabase } from './data.source.ts';
import { Booking, Film, Hall, News, Review, Screening, Seat, Ticket, User } from './entities.ts';

// ====== НАСТРОЙКИ ======
const COUNT = {
  users: 50,
  films: 30,
  halls: 4,
  rowsPerHall: 8,
  seatsPerRow: 12,
  screenings: 80,
  bookings: 120,
  reviews: 100,
  news: 15,
};

// npx tsx faker.task.ts --clear  -> сначала очистит все таблицы
const CLEAR = process.argv.includes('--clear');
// =======================

const round2 = (n: number) => Math.round(n * 100) / 100;
const SAVE_OPTS = { chunk: 200 };

async function clearAll() {
  await AppDataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of ['tickets', 'bookings', 'reviews', 'screenings', 'seats', 'halls', 'films', 'users', 'news']) {
    await AppDataSource.query(`TRUNCATE TABLE ${t}`);
  }
  await AppDataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Таблицы очищены');
}

async function seedUsers() {
  const repo = AppDataSource.getRepository(User);
  const items = repo.create(
    Array.from({ length: COUNT.users }, (_, i) => {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      return {
        // индекс в начале гарантирует уникальность email
        email: `${i}.${faker.internet.email({ firstName: first, lastName: last }).toLowerCase()}`,
        password_hash: '$2b$10$' + faker.string.alphanumeric(53), // выглядит как bcrypt-хеш
        first_name: first,
        last_name: last,
        birth_date: faker.date.birthdate({ min: 14, max: 80, mode: 'age' }),
        phone_number: faker.datatype.boolean(0.7) ? faker.phone.number().slice(0, 30) : null,
      };
    }),
  );
  const saved = await repo.save(items, SAVE_OPTS);
  console.log(`users: ${saved.length}`);
  return saved;
}

async function seedFilms() {
  const repo = AppDataSource.getRepository(Film);
  const ratings = ['G', 'PG', 'PG-13', 'R', 'NC-17'];
  const items = repo.create(
    Array.from({ length: COUNT.films }, () => ({
      title: faker.lorem.words({ min: 1, max: 4 }).replace(/^\w/, (c) => c.toUpperCase()),
      description: faker.datatype.boolean(0.9) ? faker.lorem.paragraph() : null,
      duration_minutes: faker.number.int({ min: 80, max: 180 }),
      age_rating: faker.helpers.arrayElement(ratings),
      release_date: faker.datatype.boolean(0.9) ? faker.date.past({ years: 10 }) : null,
      poster_url: faker.datatype.boolean(0.8) ? faker.image.url({ width: 400, height: 600 }) : null,
    })),
  );
  const saved = await repo.save(items, SAVE_OPTS);
  console.log(`films: ${saved.length}`);
  return saved;
}

async function seedHallsAndSeats() {
  const hallRepo = AppDataSource.getRepository(Hall);
  const seatRepo = AppDataSource.getRepository(Seat);

  const totalSeats = COUNT.rowsPerHall * COUNT.seatsPerRow;
  const halls = await hallRepo.save(
    hallRepo.create(Array.from({ length: COUNT.halls }, (_, i) => ({ name: `Hall ${i + 1}`, total_seats: totalSeats }))),
  );
  console.log(`halls: ${halls.length}`);

  const seatItems: Partial<Seat>[] = [];
  for (const hall of halls) {
    for (let r = 1; r <= COUNT.rowsPerHall; r++) {
      for (let s = 1; s <= COUNT.seatsPerRow; s++) {
        seatItems.push({
          hall_id: hall.id,
          row_num: r,
          seat_number: s,
          // последний ряд VIP, остальные обычные
          seat_type: r === COUNT.rowsPerHall ? 'vip' : 'standard',
        });
      }
    }
  }
  const seats = await seatRepo.save(seatRepo.create(seatItems), SAVE_OPTS);
  console.log(`seats: ${seats.length}`);
  return { halls, seats };
}

async function seedScreenings(films: Film[], halls: Hall[]) {
  const repo = AppDataSource.getRepository(Screening);
  const items = repo.create(
    Array.from({ length: COUNT.screenings }, () => ({
      film_id: faker.helpers.arrayElement(films).id,
      hall_id: faker.helpers.arrayElement(halls).id,
      start_time: faker.date.between({ from: faker.date.recent({ days: 14 }), to: faker.date.soon({ days: 30 }) }),
      base_price: faker.number.float({ min: 5, max: 15, fractionDigits: 2 }),
    })),
  );
  const saved = await repo.save(items, SAVE_OPTS);
  console.log(`screenings: ${saved.length}`);
  return saved;
}

async function seedBookingsAndTickets(users: User[], screenings: Screening[], seats: Seat[]) {
  const bookingRepo = AppDataSource.getRepository(Booking);
  const ticketRepo = AppDataSource.getRepository(Ticket);

  const seatsByHall = new Map<number, Seat[]>();
  for (const seat of seats) {
    if (!seatsByHall.has(seat.hall_id)) seatsByHall.set(seat.hall_id, []);
    seatsByHall.get(seat.hall_id)!.push(seat);
  }

  const taken = new Set<string>(); // "screeningId-seatId", чтобы не нарушить UNIQUE
  let bookingsCount = 0;
  let ticketsCount = 0;

  for (let i = 0; i < COUNT.bookings; i++) {
    const screening = faker.helpers.arrayElement(screenings);
    const hallSeats = seatsByHall.get(screening.hall_id) ?? [];
    const wanted = faker.helpers.arrayElements(hallSeats, faker.number.int({ min: 1, max: 5 }));

    const free = wanted.filter((s) => !taken.has(`${screening.id}-${s.id}`));
    if (free.length === 0) continue;

    const tickets = free.map((seat) => {
      taken.add(`${screening.id}-${seat.id}`);
      const mult = seat.seat_type === 'vip' ? 1.5 : 1;
      return { seat_id: seat.id, price: round2(screening.base_price * mult) };
    });
    const total = round2(tickets.reduce((sum, t) => sum + t.price, 0));

    const booking = await bookingRepo.save(
      bookingRepo.create({
        user_id: faker.helpers.arrayElement(users).id,
        created_at: faker.date.recent({ days: 30 }),
        status: faker.helpers.weightedArrayElement([
          { weight: 8, value: 'confirmed' },
          { weight: 1, value: 'pending' },
          { weight: 1, value: 'cancelled' },
        ]),
        total_amount: total,
      }),
    );

    await ticketRepo.save(
      ticketRepo.create(tickets.map((t) => ({ booking_id: booking.id, screening_id: screening.id, ...t }))),
    );

    bookingsCount++;
    ticketsCount += tickets.length;
  }
  console.log(`bookings: ${bookingsCount}`);
  console.log(`tickets: ${ticketsCount}`);
}

async function seedReviews(users: User[], films: Film[]) {
  const repo = AppDataSource.getRepository(Review);
  const used = new Set<string>(); // один отзыв от пользователя на фильм
  const items: Partial<Review>[] = [];

  for (let i = 0; i < COUNT.reviews; i++) {
    const user = faker.helpers.arrayElement(users);
    const film = faker.helpers.arrayElement(films);
    const key = `${user.id}-${film.id}`;
    if (used.has(key)) continue;
    used.add(key);

    items.push({
      film_id: film.id,
      user_id: user.id,
      rating: faker.number.int({ min: 1, max: 5 }),
      comment: faker.datatype.boolean(0.8) ? faker.lorem.sentences({ min: 1, max: 3 }) : null,
      created_at: faker.date.recent({ days: 60 }),
    });
  }
  const saved = await repo.save(repo.create(items), SAVE_OPTS);
  console.log(`reviews: ${saved.length}`);
}

async function seedNews() {
  const repo = AppDataSource.getRepository(News);
  const items = repo.create(
    Array.from({ length: COUNT.news }, () => ({
      title: faker.lorem.sentence({ min: 3, max: 8 }).slice(0, 255),
      content: faker.lorem.paragraphs({ min: 2, max: 4 }),
      published_at: faker.date.recent({ days: 90 }),
    })),
  );
  const saved = await repo.save(items, SAVE_OPTS);
  console.log(`news: ${saved.length}`);
}

async function main() {
  await ensureDatabase(); // создаёт базу, если её нет
  await AppDataSource.initialize(); // создаёт таблицы (synchronize: true)
  try {
    if (CLEAR) await clearAll();

    // порядок важен из-за внешних ключей
    const users = await seedUsers();
    const films = await seedFilms();
    const { halls, seats } = await seedHallsAndSeats();
    const screenings = await seedScreenings(films, halls);
    await seedBookingsAndTickets(users, screenings, seats);
    await seedReviews(users, films);
    await seedNews();

    console.log('Готово!');
  } catch (err) {
    console.error('Ошибка при заполнении:', err);
    process.exitCode = 1;
  } finally {
    await AppDataSource.destroy();
  }
}

main();

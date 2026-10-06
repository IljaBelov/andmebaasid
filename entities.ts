import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import type { Relation, ValueTransformer } from 'typeorm';

// MySQL отдаёт DECIMAL строкой, поэтому превращаем в number
const decimal: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? value : Number(value)),
};

// Все типы колонок указаны явно (type: '...'), чтобы работало и под tsx
// (он не поддерживает emitDecoratorMetadata).

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash!: string;

  @Column({ type: 'varchar', length: 100 })
  first_name!: string;

  @Column({ type: 'varchar', length: 100 })
  last_name!: string;

  @Column({ type: 'date' })
  birth_date!: Date;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone_number?: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}

@Entity('films')
export class Film {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'int' })
  duration_minutes!: number;

  @Column({ type: 'varchar', length: 10, default: 'G' })
  age_rating!: string;

  @Column({ type: 'date', nullable: true })
  release_date?: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  poster_url?: string | null;
}

@Entity('halls')
export class Hall {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'int' })
  total_seats!: number;
}

@Entity('seats')
@Unique('uq_hall_row_seat', ['hall_id', 'row_num', 'seat_number'])
export class Seat {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  hall_id!: number;

  @ManyToOne(() => Hall, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hall_id' })
  hall?: Relation<Hall>;

  @Column({ type: 'int' })
  row_num!: number;

  @Column({ type: 'int' })
  seat_number!: number;

  @Column({ type: 'varchar', length: 50, default: 'standard' })
  seat_type!: string;
}

@Entity('screenings')
export class Screening {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  film_id!: number;

  @ManyToOne(() => Film, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'film_id' })
  film?: Relation<Film>;

  @Column({ type: 'int' })
  hall_id!: number;

  @ManyToOne(() => Hall, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hall_id' })
  hall?: Relation<Hall>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  start_time!: Date;

  @Column({ type: 'decimal', precision: 8, scale: 2, transformer: decimal })
  base_price!: number;
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  user_id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ type: 'varchar', length: 50, default: 'confirmed' })
  status!: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, transformer: decimal })
  total_amount!: number;
}

@Entity('tickets')
@Unique('uq_screening_seat', ['screening_id', 'seat_id'])
export class Ticket {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  booking_id!: number;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking?: Relation<Booking>;

  @Column({ type: 'int' })
  screening_id!: number;

  @ManyToOne(() => Screening, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'screening_id' })
  screening?: Relation<Screening>;

  @Column({ type: 'int' })
  seat_id!: number;

  @ManyToOne(() => Seat, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seat_id' })
  seat?: Relation<Seat>;

  @Column({ type: 'decimal', precision: 8, scale: 2, transformer: decimal })
  price!: number;
}

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  film_id!: number;

  @ManyToOne(() => Film, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'film_id' })
  film?: Relation<Film>;

  @Column({ type: 'int' })
  user_id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: Relation<User>;

  @Column({ type: 'int' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}

@Entity('news')
export class News {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  published_at!: Date;
}

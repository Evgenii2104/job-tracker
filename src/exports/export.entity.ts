import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('exports')
export class Export {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ type: 'text', default: 'csv' })
  format: string;

  @Column({ type: 'text', default: 'queued' })
  status: string;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ name: 'file_path', type: 'text', nullable: true })
  filePath: string | null;

  @Column({ name: 'idempotency_key', type: 'text', nullable: true })
  idempotencyKey: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
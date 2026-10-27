import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'job_id', type: 'int' })
  jobId: number;

  @Column({ type: 'text', default: 'new' })
  status: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
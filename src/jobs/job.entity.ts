import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({type: 'text'})
  title: string;

  @Column({type: 'text'})
  company: string;

  @Column({name: 'created_by', type: 'int'})
  createdBy: number;

  @Column({name: 'created_at', type: 'timestamptz'})
  createdAt: Date;
}
import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import { DATABASE_POOL } from '../database/database.provider';
import { TasksService } from '../tasks/tasks.service';

describe('CommentsService', () => {
  let service: CommentsService;

  const mockPool = {
    query: jest.fn(),
  };

  const mockTasksService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: DATABASE_POOL, useValue: mockPool },
        { provide: TasksService, useValue: mockTasksService },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

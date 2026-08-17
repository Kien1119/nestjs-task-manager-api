import { Test, TestingModule } from '@nestjs/testing';
import { SharesService } from './shares.service';
import { DATABASE_POOL } from '../database/database.provider';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';

describe('SharesService', () => {
  let service: SharesService;

  const mockPool = {
    query: jest.fn(),
  };

  const mockTasksService = {
    findOne: jest.fn(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharesService,
        { provide: DATABASE_POOL, useValue: mockPool },
        { provide: TasksService, useValue: mockTasksService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<SharesService>(SharesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

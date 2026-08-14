import { Test, TestingModule } from '@nestjs/testing';
import { LabelsService } from './labels.service';
import { DATABASE_POOL } from '../database/database.provider';
import { TasksService } from '../tasks/tasks.service';

describe('LabelsService', () => {
  let service: LabelsService;

  const mockPool = {
    query: jest.fn(),
  };

  const mockTasksService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabelsService,
        { provide: DATABASE_POOL, useValue: mockPool },
        { provide: TasksService, useValue: mockTasksService },
      ],
    }).compile();

    service = module.get<LabelsService>(LabelsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

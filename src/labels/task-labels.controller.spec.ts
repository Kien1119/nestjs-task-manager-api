import { Test, TestingModule } from '@nestjs/testing';
import { TaskLabelsController } from './task-labels.controller';
import { LabelsService } from './labels.service';

describe('TaskLabelsController', () => {
  let controller: TaskLabelsController;

  const mockLabelsService = {
    attachLabelToTask: jest.fn(),
    detachLabelFromTask: jest.fn(),
    getLabelsOfTask: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskLabelsController],
      providers: [{ provide: LabelsService, useValue: mockLabelsService }],
    }).compile();

    controller = module.get<TaskLabelsController>(TaskLabelsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

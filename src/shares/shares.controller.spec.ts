import { Test, TestingModule } from '@nestjs/testing';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';

describe('SharesController', () => {
  let controller: SharesController;

  const mockSharesService = {
    create: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SharesController],
      providers: [{ provide: SharesService, useValue: mockSharesService }],
    }).compile();

    controller = module.get<SharesController>(SharesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll gọi usersService.findAll', async () => {
    const users = [{ id: 1, email: 'a@example.com' }];
    mockUsersService.findAll.mockResolvedValue(users);

    const result = await controller.findAll();

    expect(result).toEqual(users);
  });
});

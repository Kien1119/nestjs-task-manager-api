import { Request } from 'express';
import { RequestUser } from './request-user.type';

export interface RequestWithUser extends Request {
  user: RequestUser;
}

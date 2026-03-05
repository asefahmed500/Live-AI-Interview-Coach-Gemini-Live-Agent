import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UserData {
  id: string;
  email: string;
  name: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof UserData | undefined, ctx: ExecutionContext): UserData | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserData;

    return data ? user?.[data] : user;
  }
);

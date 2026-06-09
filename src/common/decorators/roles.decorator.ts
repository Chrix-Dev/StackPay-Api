import { SetMetadata } from '@nestjs/common';

export const AdminOnly = () => SetMetadata('role', 'ADMIN');
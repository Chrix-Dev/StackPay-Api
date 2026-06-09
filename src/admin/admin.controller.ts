import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminOnly } from '../common/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@AdminOnly()
@Controller('api/v1/admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('developers')
  listDevelopers() {
    return this.adminService.listDevelopers();
  }

  @Get('developers/:id')
  getDeveloper(@Param('id') id: string) {
    return this.adminService.getDeveloper(id);
  }

  @Patch('developers/:id/toggle')
  toggleDeveloper(@Param('id') id: string) {
    return this.adminService.toggleDeveloper(id);
  }

  @Patch('developers/:id/unlock-wallet')
  unlockWallet(@Param('id') id: string) {
    return this.adminService.unlockWallet(id);
  }

  @Get('transactions')
  listTransactions() {
    return this.adminService.listTransactions();
  }

  @Get('webhooks/deliveries')
  listWebhookDeliveries() {
    return this.adminService.listWebhookDeliveries();
  }
}
import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@Req() req: any) {
    return this.dashboardService.getStats(req.user.id);
  }

  @Get('logs')
  getLogs(@Req() req: any) {
    return this.dashboardService.getLogs(req.user.id);
  }

  @Get('logs/:id')
  getLog(@Req() req: any, @Param('id') id: string) {
    return this.dashboardService.getLog(req.user.id, id);
  }

  @Get('audit-logs')
  getAuditLogs(@Req() req: any) {
    return this.dashboardService.getAuditLogs(req.user.id);
  }
}
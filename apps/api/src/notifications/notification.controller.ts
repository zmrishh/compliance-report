import { Body, Controller, Get, HttpCode, HttpStatus, Put, UseGuards } from '@nestjs/common';
import { updateNotificationPreferencesSchema, type AuthenticatedUser, type UpdateNotificationPreferencesDto } from '@compliance/shared';

import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { NotificationService } from './notification.service.js';

@Controller('me/notification-preferences')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.getPreferences(user.userId, user.orgId);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateNotificationPreferencesSchema)) body: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationService.updatePreferences(user.userId, user.orgId, body.preferences);
  }
}

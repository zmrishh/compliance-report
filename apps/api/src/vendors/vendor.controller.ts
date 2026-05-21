import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  createVendorSchema,
  updateVendorSchema,
  type AuthenticatedUser,
  type CreateVendorDto,
  type UpdateVendorDto,
} from '@compliance/shared';

import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { VendorService } from './vendor.service.js';

@Controller('vendors')
@UseGuards(AuthGuard)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createVendorSchema)) body: CreateVendorDto,
  ) {
    return this.vendorService.create(body, user.orgId, user.userId);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.vendorService.list(user.orgId);
  }

  @Get('due-for-review')
  listDueForReview(@CurrentUser() user: AuthenticatedUser) {
    return this.vendorService.listDueForReview(user.orgId);
  }

  @Get(':vendorId')
  get(@Param('vendorId') vendorId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.vendorService.get(vendorId, user.orgId);
  }

  @Patch(':vendorId')
  update(
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateVendorSchema)) body: UpdateVendorDto,
  ) {
    return this.vendorService.update(vendorId, body, user.orgId, user.userId);
  }

  @Delete(':vendorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('vendorId') vendorId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.vendorService.softDelete(vendorId, user.orgId);
  }

  @Post(':vendorId/controls')
  @HttpCode(HttpStatus.CREATED)
  linkControl(
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { controlId: string },
  ) {
    return this.vendorService.linkControl(vendorId, body.controlId, user.orgId);
  }

  @Delete(':vendorId/controls/:controlId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unlinkControl(
    @Param('vendorId') vendorId: string,
    @Param('controlId') controlId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vendorService.unlinkControl(vendorId, controlId, user.orgId);
  }
}

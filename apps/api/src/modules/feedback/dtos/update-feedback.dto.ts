import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateFeedbackDto } from './create-feedback.dto';

export class UpdateFeedbackDto extends PartialType(
  OmitType(CreateFeedbackDto, ['sessionId'] as const)
) {}

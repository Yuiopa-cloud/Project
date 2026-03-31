import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class TrackViewDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guestToken?: string;
}

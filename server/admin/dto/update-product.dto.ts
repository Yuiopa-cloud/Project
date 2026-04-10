import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priceMad?: string;
}

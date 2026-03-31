import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  Matches,
  MaxLength,
} from 'class-validator';

/// Moroccan mobile: +212 or 0 prefix normalize on server
export class RegisterDto {
  @ApiProperty({ example: '+212612345678' })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Youssef' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/[\p{L}\s'-]/u, { message: 'Invalid characters in first name' })
  firstName!: string;

  @ApiProperty({ example: 'Chafiki' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/[\p{L}\s'-]/u, { message: 'Invalid characters in last name' })
  lastName!: string;

  @ApiPropertyOptional({ enum: ['fr', 'ar'] })
  @IsOptional()
  @IsString()
  locale?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  identifier!: string;

  /** Backward compatibility for older clients sending { phone, password }. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(8)
  phone?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password!: string;
}

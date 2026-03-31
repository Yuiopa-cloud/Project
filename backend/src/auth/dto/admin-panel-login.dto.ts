import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AdminPanelLoginDto {
  @ApiProperty({ example: '16061606' })
  @IsString()
  @MinLength(6, { message: 'Mot de passe trop court' })
  password!: string;
}

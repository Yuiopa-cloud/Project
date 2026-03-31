import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class FraudDecideDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';
}

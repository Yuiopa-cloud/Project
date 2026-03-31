import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
  ArrayMinSize,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

class CheckoutLineDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;
}

class MoroccanAddressDto {
  @ApiProperty({ example: 'Angle rue X' })
  @IsString()
  @MinLength(3)
  line1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty({ example: 'Hay Riad' })
  @IsString()
  @MinLength(2)
  quarter!: string;

  @ApiProperty({ example: 'CASA' })
  @IsString()
  cityCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CheckoutDto {
  @ApiProperty({ type: [CheckoutLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutLineDto)
  items!: CheckoutLineDto[];

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.CASH_ON_DELIVERY })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiProperty()
  @ValidateNested()
  @Type(() => MoroccanAddressDto)
  shipping!: MoroccanAddressDto;

  @ApiProperty({ example: 'Youssef' })
  @IsString()
  @MinLength(2)
  firstName!: string;

  @ApiProperty({ example: 'Chafiki' })
  @IsString()
  @MinLength(2)
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ description: 'Affiliate / influencer code' })
  @IsOptional()
  @IsString()
  affiliateCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  phoneConfirmed?: boolean;
}

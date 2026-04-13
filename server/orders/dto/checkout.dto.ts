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
import { Type, Transform } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class CheckoutLineDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Required when the product uses variants (size, color, …)',
  })
  @IsOptional()
  @IsString()
  variantId?: string;
}

class ShippingAddressDto {
  @ApiProperty({ example: 'Angle rue X' })
  @IsString()
  @MinLength(3)
  line1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line2?: string;

  /** Neighbourhood / district — optional for faster checkout */
  @ApiPropertyOptional({ example: 'Hay Riad' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null) return undefined;
    if (typeof value !== 'string') return value;
    const t = value.trim();
    return t === '' ? undefined : t;
  })
  @IsString()
  quarter?: string;

  /** Tariff bucket (Moroccan city or OTHER for international / rest of world) */
  @ApiProperty({ example: 'CASA' })
  @IsString()
  cityCode!: string;

  /** Customer’s city or locality as typed (shown on emails & admin) */
  @ApiProperty({ example: 'Casablanca' })
  @IsString()
  @MinLength(2)
  cityLabel!: string;

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
  @Type(() => ShippingAddressDto)
  shipping!: ShippingAddressDto;

  @ApiProperty({ example: 'Youssef' })
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ example: 'Chafiki' })
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null || typeof value !== 'string') return undefined;
    const t = value.trim();
    return t === '' ? undefined : t;
  })
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

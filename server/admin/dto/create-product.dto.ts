import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

/** Manager-friendly create: SKU and slug are optional (auto-generated). Arabic mirrors French when omitted. */
export class CreateProductDto {
  @ApiProperty({ example: 'Tapis premium SUV' })
  @IsString()
  @MinLength(2)
  nameFr!: string;

  @ApiProperty({
    example: 'Finition premium, résistant eau & boue. Compatible SUV et berlines.',
  })
  @IsString()
  @MinLength(3)
  descriptionFr!: string;

  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiProperty({ example: '449.00' })
  @IsString()
  priceMad!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  descriptionAr?: string;

  @ApiPropertyOptional({
    description: 'URL handle; generated from French title if omitted',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  slug?: string;

  @ApiPropertyOptional({
    description: 'Stock keeping unit; generated if omitted',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  compareAtMad?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

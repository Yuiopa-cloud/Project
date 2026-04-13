import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class VariantOptionValueInputDto {
  @ApiProperty()
  @IsString()
  valueFr!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  valueAr?: string;

  /** CSS hex for color swatches, e.g. #22c55e */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  colorHex?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class VariantOptionInputDto {
  @ApiProperty()
  @IsString()
  nameFr!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nameAr?: string;

  @ApiProperty({ type: [VariantOptionValueInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VariantOptionValueInputDto)
  values!: VariantOptionValueInputDto[];
}

export class VariantRowInputDto {
  @ApiProperty()
  @IsString()
  sku!: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  priceMad?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  compareAtMad?: string | null;

  @ApiProperty()
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  images!: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  /**
   * For each option (same order as `options`), the index of the chosen value
   * in that option’s `values` array (0-based).
   */
  @ApiProperty({ type: [Number], example: [0, 1] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  valueIndexes!: number[];
}

export class ReplaceProductVariantsDto {
  @ApiProperty({
    description:
      'When false, all options/variants are removed and the product uses base price/stock only.',
  })
  @IsBoolean()
  variantsEnabled!: boolean;

  @ApiProperty({ type: [VariantOptionInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantOptionInputDto)
  options!: VariantOptionInputDto[];

  @ApiProperty({ type: [VariantRowInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantRowInputDto)
  variants!: VariantRowInputDto[];
}

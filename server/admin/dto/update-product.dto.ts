import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameFr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  descriptionFr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  descriptionAr?: string;

  @ApiPropertyOptional({
    description: 'Store URL handle; changing it updates the product page URL',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priceMad?: string;

  @ApiPropertyOptional({
    description: 'Send empty string to clear compare-at price',
  })
  @IsOptional()
  @IsString()
  compareAtMad?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'When true, storefront requires a variant (size/color, etc.). Configure options/variants via PUT /admin/products/:id/variants.',
  })
  @IsOptional()
  @IsBoolean()
  variantsEnabled?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Alert when stock is at or below this level' })
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional({
    description:
      'Extra fields: costMad, barcode, weightKg, videoUrl, seoTitleFr, seoDescriptionFr, tags (string[]), vendorNote, trackInventory (boolean), etc.',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

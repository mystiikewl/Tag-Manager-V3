"""
Enhanced Pydantic models for Tag Manager V2 API - Phase 2
"""

from pydantic import BaseModel, Field, validator, model_validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import re
import uuid


# Base response models for standardization
class APIResponse(BaseModel):
    """Standardized API response wrapper"""
    success: bool = Field(default=True, description="Operation success status")
    data: Any = Field(..., description="Response data payload")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Response metadata")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class PaginationInfo(BaseModel):
    """Pagination metadata"""
    page: int = Field(default=1, ge=1, description="Current page number")
    page_size: int = Field(default=50, ge=1, le=1000, description="Items per page")
    total_items: int = Field(..., ge=0, description="Total number of items")
    total_pages: int = Field(..., ge=0, description="Total number of pages")
    has_next: bool = Field(default=False, description="Whether there are more pages")
    has_previous: bool = Field(default=False, description="Whether there are previous pages")


class ErrorDetail(BaseModel):
    """Detailed error information"""
    field: Optional[str] = Field(None, description="Field that caused the error")
    value: Optional[Any] = Field(None, description="Value that caused the error")
    message: str = Field(..., description="Error message")


class ErrorResponse(BaseModel):
    """Enhanced error response model"""
    success: bool = Field(default=False, description="Always false for errors")
    error: str = Field(..., description="Error message")
    code: str = Field(..., description="Error code for programmatic handling")
    details: Optional[List[ErrorDetail]] = Field(None, description="Detailed error information")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")
    request_id: Optional[str] = Field(None, description="Unique request identifier")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# Enhanced product models
class ProductSummary(BaseModel):
    """Enhanced product summary model for API responses"""
    product_id: str = Field(..., min_length=1, max_length=255, description="Unique product identifier")
    product_name: str = Field(..., min_length=1, max_length=500, description="Product display name")
    has_allocations: bool = Field(default=False, description="Whether product has category assignments")
    category_count: int = Field(default=0, ge=0, description="Number of categories assigned")
    last_modified: Optional[datetime] = Field(None, description="Last modification timestamp")

    @validator('product_id')
    def validate_product_id(cls, v):
        """Validate product ID format"""
        if not v or not v.strip():
            raise ValueError("Product ID cannot be empty")
        if not re.match(r'^[a-zA-Z0-9\-_\.]+$', v):
            raise ValueError("Product ID can only contain letters, numbers, hyphens, underscores, and dots")
        return v.strip()

    @validator('product_name')
    def validate_product_name(cls, v):
        """Validate product name"""
        if not v or not v.strip():
            raise ValueError("Product name cannot be empty")
        return v.strip()

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class CategoryBase(BaseModel):
    """Enhanced base category model"""
    id: str = Field(..., min_length=1, max_length=255, description="Unique category identifier")
    name: str = Field(..., min_length=1, max_length=100, description="Category display name")
    level: int = Field(..., ge=1, le=3, description="Category level (1-3)")
    parent_id: Optional[str] = Field(None, description="Parent category ID")
    hasChildren: bool = Field(default=False, description="Whether category has child categories")
    created_at: Optional[datetime] = Field(None, description="Category creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Category last update timestamp")

    @validator('id')
    def validate_category_id(cls, v):
        """Validate category ID format"""
        if not v or not v.strip():
            raise ValueError("Category ID cannot be empty")
        # Allow common business characters but prevent dangerous ones
        if re.search(r'[<>"/\\|?*\x00-\x1f]', v):
            raise ValueError("Category ID contains invalid characters")
        return v.strip()

    @validator('name')
    def validate_category_name(cls, v):
        """Validate category name"""
        if not v or not v.strip():
            raise ValueError("Category name cannot be empty")
        if len(v.strip()) > 100:
            raise ValueError("Category name cannot exceed 100 characters")
        return v.strip()

    @validator('level')
    def validate_level_range(cls, v):
        """Validate category level is within allowed range"""
        if v not in [1, 2, 3]:
            raise ValueError("Category level must be 1, 2, or 3")
        return v

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class CategoryCreateRequest(BaseModel):
    """Enhanced request model for creating new categories"""
    name: str = Field(..., min_length=1, max_length=100, description="Category name")
    level: int = Field(..., ge=1, le=3, description="Category level")
    parent_id: Optional[str] = Field(None, description="Parent category ID")

    @validator('name')
    def validate_name(cls, v):
        """Validate category name"""
        if not v or not v.strip():
            raise ValueError("Category name cannot be empty")
        if len(v.strip()) > 100:
            raise ValueError("Category name cannot exceed 100 characters")
        # Check for special characters that might cause issues
        if re.search(r'[<>"/\\|?*\x00-\x1f]', v):
            raise ValueError("Category name contains invalid characters")
        return v.strip()

    @validator('level')
    def validate_level(cls, v):
        """Validate category level"""
        if v not in [1, 2, 3]:
            raise ValueError("Category level must be 1, 2, or 3")
        return v

    @model_validator(mode='after')
    def validate_level_parent_relationship(self):
        """Validate that level 2 and 3 categories have parent_id"""
        level = self.level
        parent_id = self.parent_id

        if level and level > 1 and not parent_id:
            raise ValueError('Parent category is required for level 2 and 3 categories')

        if level and level == 1 and parent_id:
            raise ValueError('Level 1 categories cannot have a parent category')

        return self


class CategoryUpdateRequest(BaseModel):
    """Request model for updating categories"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Category name")
    level: Optional[int] = Field(None, ge=1, le=3, description="Category level")
    parent_id: Optional[str] = Field(None, description="Parent category ID")


class AssignCategoriesRequest(BaseModel):
    """Enhanced request model for assigning categories to products"""
    category_ids: List[str] = Field(..., min_items=1, max_items=50, description="List of category IDs to assign")

    @validator('category_ids')
    def validate_category_ids(cls, v):
        """Validate category IDs"""
        if not v:
            raise ValueError("At least one category ID must be provided")

        if len(v) > 50:
            raise ValueError("Cannot assign more than 50 categories at once")

        # Check for duplicates
        if len(v) != len(set(v)):
            raise ValueError("Duplicate category IDs are not allowed")

        # Validate each category ID format
        for category_id in v:
            if not category_id or not category_id.strip():
                raise ValueError("Category IDs cannot be empty")
            if not re.match(r'^[a-zA-Z0-9\-_\s\.]+$', category_id):
                raise ValueError(f"Invalid category ID format: {category_id}")

        return [cid.strip() for cid in v]


class BulkAssignCategoriesRequest(BaseModel):
    """Request model for bulk category assignment"""
    product_ids: List[str] = Field(..., min_items=1, description="List of product IDs")
    category_ids: List[str] = Field(..., min_items=1, description="List of category IDs to assign")


class BulkRemoveCategoriesRequest(BaseModel):
    """Request model for bulk category removal"""
    product_ids: List[str] = Field(..., min_items=1, description="List of product IDs")
    category_ids: List[str] = Field(..., min_items=1, description="List of category IDs to remove")


class ErrorResponse(BaseModel):
    """Standard error response model"""
    error: str = Field(..., description="Error message")
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional error details")


class SuccessResponse(BaseModel):
    """Enhanced success response model"""
    success: bool = Field(default=True, description="Always true for successful responses")
    message: str = Field(..., description="Success message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional response details")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    request_id: Optional[str] = Field(None, description="Unique request identifier")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ProductStatistics(BaseModel):
    """Product statistics model"""
    total_products: int = Field(..., description="Total number of products")
    categorized_products: int = Field(..., description="Number of products with categories")
    uncategorized_products: int = Field(..., description="Number of products without categories")
    total_categories: int = Field(..., description="Total number of categories")


class ProductCategorizationStatus(BaseModel):
    """Product categorization status model"""
    product_id: str = Field(..., description="Product ID")
    product_name: str = Field(..., description="Product name")
    category_count: int = Field(..., description="Number of categories assigned")
    has_categories: bool = Field(..., description="Whether product has categories")
    last_modified: Optional[datetime] = Field(None, description="Last modification timestamp")
# Phase 8: Shopify API Integration

## Goal

Replace the SQLite database with Shopify API integration to manage products and tags directly through Shopify's platform, enabling real-time synchronization and user-defined tag group organization.

## Current Architecture vs. Target Architecture

### Current State

- SQLite database for product and category data
- JSON files for category definitions
- Manual data synchronization
- Local data management

### Target State

- Shopify API as single source of truth
- Real-time product and tag synchronization
- User-defined tag groups via metafields
- Shopify webhooks for data consistency

## Implementation Steps

### 8.1 Shopify API Client Setup

**Configure Shopify API connection:**

```python
# shopify_client.py
from shopify_api_client import ShopifyAPI
import os
from typing import List, Dict, Any

class ShopifyClient:
    def __init__(self):
        self.client = ShopifyAPI(
            domain=os.getenv('SHOPIFY_STORE_DOMAIN'),
            token=os.getenv('SHOPIFY_ADMIN_API_TOKEN'),
            version=os.getenv('SHOPIFY_API_VERSION', '2024-10')
        )

    async def get_products(self, limit: int = 250) -> List[Dict[str, Any]]:
        """Fetch products from Shopify with pagination."""
        try:
            response = await self.client.get('products', {
                'limit': limit,
                'fields': 'id,title,handle,tags,metafields'
            })
            return response.get('products', [])
        except Exception as e:
            raise ShopifyAPIError(f"Failed to fetch products: {str(e)}")

    async def get_product_tags(self, product_id: str) -> List[str]:
        """Get tags for a specific product."""
        try:
            response = await self.client.get(f'products/{product_id}')
            product = response.get('product', {})
            return product.get('tags', [])
        except Exception as e:
            raise ShopifyAPIError(f"Failed to fetch product tags: {str(e)}")

    async def update_product_tags(self, product_id: str, tags: List[str]) -> Dict[str, Any]:
        """Update tags for a specific product."""
        try:
            response = await self.client.put(f'products/{product_id}', {
                'product': {
                    'id': product_id,
                    'tags': ','.join(tags)
                }
            })
            return response.get('product', {})
        except Exception as e:
            raise ShopifyAPIError(f"Failed to update product tags: {str(e)}")
```

### 8.2 Tag Group Management via Metafields

**Implement user-defined tag groups:**

```python
# tag_groups.py
class TagGroupManager:
    METAFIELD_NAMESPACE = 'custom'
    METAFIELD_KEY = 'tag_groups'

    async def get_tag_groups(self, shopify_client: ShopifyClient) -> Dict[str, List[str]]:
        """Get all tag groups from shop-level metafields."""
        try:
            response = await shopify_client.client.get('metafields', {
                'namespace': self.METAFIELD_NAMESPACE,
                'key': self.METAFIELD_KEY
            })

            metafields = response.get('metafields', [])
            if metafields:
                return json.loads(metafields[0]['value'])
            return {}
        except Exception as e:
            raise TagGroupError(f"Failed to fetch tag groups: {str(e)}")

    async def update_tag_group(self, shopify_client: ShopifyClient,
                             group_name: str, tags: List[str]) -> Dict[str, Any]:
        """Update a specific tag group."""
        try:
            # Get existing groups
            groups = await self.get_tag_groups(shopify_client)
            groups[group_name] = tags

            # Update metafield
            metafield_data = {
                'metafield': {
                    'namespace': self.METAFIELD_NAMESPACE,
                    'key': self.METAFIELD_KEY,
                    'value': json.dumps(groups),
                    'type': 'json_string'
                }
            }

            response = await shopify_client.client.post('metafields', metafield_data)
            return response.get('metafield', {})
        except Exception as e:
            raise TagGroupError(f"Failed to update tag group: {str(e)}")

    async def delete_tag_group(self, shopify_client: ShopifyClient, group_name: str) -> bool:
        """Delete a tag group."""
        try:
            groups = await self.get_tag_groups(shopify_client)
            if group_name in groups:
                del groups[group_name]
                await self.update_tag_groups(shopify_client, groups)
            return True
        except Exception as e:
            raise TagGroupError(f"Failed to delete tag group: {str(e)}")
```

### 8.3 API Endpoint Updates

**Update existing endpoints to use Shopify API:**

```python
# Updated app.py endpoints
@app.get('/api/products')
async def get_products(shopify_client: ShopifyClient = Depends(get_shopify_client)):
    """Get products from Shopify with tag information."""
    try:
        products = await shopify_client.get_products()

        # Transform Shopify data to our format
        transformed_products = []
        for product in products:
            transformed_products.append({
                'product_id': str(product['id']),
                'product_name': product['title'],
                'product_handle': product['handle'],
                'tags': product.get('tags', []),
                'has_allocations': len(product.get('tags', [])) > 0
            })

        return transformed_products
    except ShopifyAPIError as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.post('/api/products/{product_id}/tags')
async def assign_tags(
    product_id: str,
    request: AssignTagsRequest,
    shopify_client: ShopifyClient = Depends(get_shopify_client)
):
    """Assign tags to a product in Shopify."""
    try:
        # Get current tags
        current_tags = await shopify_client.get_product_tags(product_id)

        # Add new tags (avoiding duplicates)
        updated_tags = list(set(current_tags + request.tags))

        # Update in Shopify
        await shopify_client.update_product_tags(product_id, updated_tags)

        return {
            'message': 'Tags assigned successfully',
            'product_id': product_id,
            'tags': updated_tags
        }
    except ShopifyAPIError as e:
        raise HTTPException(status_code=503, detail=str(e))
```

### 8.4 Tag Group API Endpoints

**Add new endpoints for tag group management:**

```python
@app.get('/api/tag-groups')
async def get_tag_groups(
    tag_manager: TagGroupManager = Depends(get_tag_manager),
    shopify_client: ShopifyClient = Depends(get_shopify_client)
):
    """Get all tag groups."""
    try:
        groups = await tag_manager.get_tag_groups(shopify_client)
        return groups
    except TagGroupError as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.post('/api/tag-groups')
async def create_tag_group(
    request: CreateTagGroupRequest,
    tag_manager: TagGroupManager = Depends(get_tag_manager),
    shopify_client: ShopifyClient = Depends(get_shopify_client)
):
    """Create a new tag group."""
    try:
        result = await tag_manager.update_tag_group(
            shopify_client, request.name, request.tags
        )
        return {
            'message': 'Tag group created successfully',
            'group': result
        }
    except TagGroupError as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.put('/api/tag-groups/{group_name}')
async def update_tag_group(
    group_name: str,
    request: UpdateTagGroupRequest,
    tag_manager: TagGroupManager = Depends(get_tag_manager),
    shopify_client: ShopifyClient = Depends(get_shopify_client)
):
    """Update an existing tag group."""
    try:
        result = await tag_manager.update_tag_group(
            shopify_client, group_name, request.tags
        )
        return {
            'message': 'Tag group updated successfully',
            'group': result
        }
    except TagGroupError as e:
        raise HTTPException(status_code=503, detail=str(e))
```

### 8.5 Data Synchronization Strategy

**Implement caching and synchronization:**

```python
# sync_manager.py
class SyncManager:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.cache_ttl = 300  # 5 minutes

    async def get_cached_products(self) -> Optional[List[Dict]]:
        """Get products from cache if available."""
        cached = await self.redis.get('shopify_products')
        if cached:
            return json.loads(cached)
        return None

    async def cache_products(self, products: List[Dict]):
        """Cache products data."""
        await self.redis.setex(
            'shopify_products',
            self.cache_ttl,
            json.dumps(products)
        )

    async def sync_products(self, shopify_client: ShopifyClient) -> List[Dict]:
        """Sync products from Shopify with caching."""
        try:
            products = await shopify_client.get_products()

            # Transform and cache
            transformed = self.transform_products(products)
            await self.cache_products(transformed)

            return transformed
        except Exception as e:
            # Try to return cached data on failure
            cached = await self.get_cached_products()
            if cached:
                return cached
            raise ShopifyAPIError(f"Failed to sync products: {str(e)}")
```

### 8.6 Webhook Integration

**Handle Shopify webhooks for real-time updates:**

```python
# webhooks.py
@app.post('/webhooks/products/update')
async def handle_product_update(request: Request):
    """Handle Shopify product update webhook."""
    try:
        # Verify webhook signature
        await verify_shopify_webhook(request)

        # Get updated product data
        payload = await request.json()
        product = payload.get('product', {})

        # Update cache
        await sync_manager.invalidate_product_cache(product['id'])

        return {'status': 'success'}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post('/webhooks/products/delete')
async def handle_product_delete(request: Request):
    """Handle Shopify product deletion webhook."""
    try:
        await verify_shopify_webhook(request)
        payload = await request.json()
        product_id = payload.get('product', {}).get('id')

        await sync_manager.invalidate_product_cache(product_id)

        return {'status': 'success'}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

## Testing Strategy

### Shopify API Tests

- Mock Shopify API responses
- Test error handling for API failures
- Test caching behavior
- Test webhook signature verification

### Integration Tests

- Test full workflows with mocked Shopify API
- Test data transformation and caching
- Test tag group management
- Test error recovery scenarios

## Success Criteria

- [ ] Shopify API client implemented and tested
- [ ] All endpoints migrated from database to Shopify API
- [ ] Tag group management via metafields working
- [ ] Caching strategy implemented
- [ ] Webhook integration for real-time updates
- [ ] Graceful fallback to cached data on API failures
- [ ] Backward compatibility maintained during transition

## Files to Create/Modify

- `shopify_client.py` - Shopify API client
- `tag_groups.py` - Tag group management
- `sync_manager.py` - Data synchronization and caching
- `webhooks.py` - Shopify webhook handlers
- Update `app.py` - Replace database calls with Shopify API calls
- Update `models.py` - Add Shopify-specific models
- Create `.env` - Shopify API configuration (already exists)
- Update `requirements.txt` - Add Shopify API dependencies

## Risk Mitigation

1. **API Rate Limiting**: Implement caching and batch operations
2. **API Failures**: Add retry logic and fallback to cached data
3. **Data Consistency**: Use webhooks for real-time updates
4. **Migration Safety**: Gradual rollout with database as backup
5. **Cost Management**: Monitor API usage and implement efficient querying

## Timeline

- Week 1: Shopify API client and basic integration
- Week 2: Tag group management implementation
- Week 3: Endpoint migration and caching
- Week 4: Webhook integration and testing

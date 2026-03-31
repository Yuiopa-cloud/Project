# API examples — Atlas Auto

Base URL: `https://your-api.example.com/api` (local: `http://localhost:4000/api`).

All responses are JSON unless noted. Public routes do not require a JWT; attach `Authorization: Bearer <accessToken>` for protected routes.

## Auth

### Register

```http
POST /auth/register
Content-Type: application/json

{
  "phone": "+212612345678",
  "password": "SecurePass12!",
  "firstName": "Youssef",
  "lastName": "Chafiki",
  "email": "optional@example.com",
  "locale": "fr"
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "phone": "+212612345678",
  "password": "SecurePass12!"
}
```

### Refresh

```http
POST /auth/refresh
Content-Type: application/json

{ "refreshToken": "<token from login/register>" }
```

## Catalog

```http
GET /products?q=led&sort=popular&take=24&skip=0
GET /products/tapis-aluminium-premium
GET /products/search?q=tapis&limit=8
GET /categories
GET /delivery-zones
```

## Cart (guest or user)

Optional `Authorization` merges identity; `guestToken` from first `GET /cart?guestToken=`.

```http
GET /cart?guestToken=
POST /cart/items
{ "productId": "cuid", "quantity": 1, "guestToken": "optional" }
```

## Coupons

```http
GET /coupons/validate?code=WELCOME10&subtotal=250
```

## Checkout

```http
POST /orders/checkout
Content-Type: application/json
Authorization: Bearer <optional customer token>

{
  "items": [{ "productId": "...", "quantity": 1 }],
  "paymentMethod": "CASH_ON_DELIVERY",
  "couponCode": "WELCOME10",
  "affiliateCode": "DRIVEMA",
  "firstName": "Aicha",
  "lastName": "El Idrissi",
  "guestEmail": "aicha@example.com",
  "phoneConfirmed": true,
  "shipping": {
    "line1": "Av. des FAR",
    "quarter": "Agdal",
    "cityCode": "RABAT",
    "phone": "0661122334"
  }
}
```

Response includes `order`, `fraud`, `whatsappConfirmUrl`, and optional `stripeClientSecret` if `paymentMethod` is `STRIPE`.

## Reviews & wishlist

```http
POST /reviews
Authorization: Bearer <token>
{ "productId": "...", "rating": 5, "title": "Top", "body": "..." }

GET /reviews/product/<productId>

GET /wishlist
POST /wishlist/<productId>
DELETE /wishlist/<productId>
```

## Recommendations

```http
GET /recommendations/product/<productId>/bundles
GET /recommendations/product/<productId>/related
```

## Admin (role `ADMIN`)

```http
GET /admin/dashboard
GET /admin/orders?status=PENDING_CONFIRMATION
PATCH /admin/orders/<id>/status
{ "status": "PROCESSING" }

POST /admin/orders/<orderId>/fraud-decision
{ "decision": "APPROVED" }

POST /admin/products
{ "slug": "...", "sku": "...", "nameFr": "...", "nameAr": "...", ... }
```

## Health

```http
GET /health
```

# API Response Standardization Guide

## Current Issue
Different endpoints return different response formats, making frontend consumption difficult and error-prone.

## Standard Response Format

All API responses should follow this structure:

### Success Response
```typescript
{
  success: true;
  message: string;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  timestamp: string; // ISO 8601 format
}
```

### Error Response
```typescript
{
  success: false;
  message: string;
  error?: {
    code: string;
    details?: any;
  };
  timestamp: string;
}
```

## Implementation

### Use the Helper Function

In `backend/src/utils/helpers.ts`:

```typescript
import { formatResponse, formatError } from './helpers.js';

// ✅ Good - Standardized response
export const getPatients = async (req: Request, res: Response) => {
  const patients = await prisma.patient.findMany();
  
  return res.status(200).json(
    formatResponse(patients, 'Patients retrieved successfully', {
      total: patients.length
    })
  );
};

// ✅ Good - Standardized error
export const getPatient = async (req: Request, res: Response) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id }
    });
    
    if (!patient) {
      return res.status(404).json(
        formatError('Patient not found', 404)
      );
    }
    
    return res.status(200).json(
      formatResponse(patient, 'Patient retrieved successfully')
    );
  } catch (error) {
    return res.status(500).json(
      formatError('Failed to retrieve patient', 500, error.message)
    );
  }
};
```

### Common Response Patterns

#### 1. Single Resource Creation
```typescript
const patient = await prisma.patient.create({ data });

return res.status(201).json(
  formatResponse(patient, 'Patient created successfully')
);
```

#### 2. Paginated List
```typescript
const [patients, total] = await Promise.all([
  prisma.patient.findMany({ skip, take }),
  prisma.patient.count()
]);

return res.status(200).json(
  formatResponse(patients, 'Patients retrieved successfully', {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  })
);
```

#### 3. Update Operation
```typescript
const updated = await prisma.patient.update({ where, data });

return res.status(200).json(
  formatResponse(updated, 'Patient updated successfully')
);
```

#### 4. Delete Operation
```typescript
await prisma.patient.delete({ where: { id } });

return res.status(200).json(
  formatResponse(null, 'Patient deleted successfully')
);
```

#### 5. File Upload
```typescript
const result = await uploadFile(file);

return res.status(200).json(
  formatResponse(
    { url: result.url, filename: result.filename },
    'File uploaded successfully'
  )
);
```

## HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (resource creation) |
| 204 | No Content | Successful DELETE (no response body) |
| 400 | Bad Request | Invalid input, validation errors |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource, constraint violation |
| 422 | Unprocessable Entity | Validation errors (alternative to 400) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

## Migration Checklist

For each controller:

- [ ] Import `formatResponse` and `formatError` from helpers
- [ ] Wrap all responses with `formatResponse()`
- [ ] Wrap all errors with `formatError()`
- [ ] Add appropriate HTTP status codes
- [ ] Include meaningful messages
- [ ] Add pagination metadata for list endpoints
- [ ] Remove inconsistent response structures
- [ ] Test with frontend to ensure compatibility

## Example Migration

### Before (Inconsistent)
```typescript
// Different formats in different controllers
res.json({ patient });
res.json(patients);
res.json({ success: true, data: patient });
res.json({ message: 'done', result: patient });
```

### After (Standardized)
```typescript
// All use the same format
res.status(200).json(formatResponse(patient, 'Patient retrieved'));
res.status(200).json(formatResponse(patients, 'Patients list', { total }));
res.status(201).json(formatResponse(patient, 'Patient created'));
```

## Frontend Consumption

With standardized responses, frontend can have a single response handler:

```typescript
// frontend/src/api/client.ts
async function handleResponse<T>(response: Response): Promise<T> {
  const result = await response.json();
  
  if (!result.success) {
    throw new ApiError(result.message, result.error);
  }
  
  return result.data as T;
}

// Usage
const patients = await handleResponse<Patient[]>(fetch('/api/patients'));
```

## Benefits

1. **Predictable**: Frontend knows exactly what to expect
2. **Debugging**: Clear success/error distinction
3. **Logging**: Consistent structure for monitoring
4. **Documentation**: Self-documenting API
5. **Error Handling**: Unified error handling strategy
6. **Testing**: Easier to write tests

## Testing

Add tests to verify response format:

```typescript
describe('API Response Format', () => {
  it('should return standardized success response', async () => {
    const response = await request(app).get('/api/patients');
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body.data).toBeInstanceOf(Array);
  });
  
  it('should return standardized error response', async () => {
    const response = await request(app).get('/api/patients/invalid-id');
    
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.status).toBe(404);
  });
});
```

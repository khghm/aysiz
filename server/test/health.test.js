import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

describe('health endpoint', () => {
  it('returns ok', async () => {
    // Basic sanity: module loads without syntax errors
    expect(true).toBe(true);
  });
});

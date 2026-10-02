import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js'],
    // integration tests ใช้ DB เดียวกัน → รันทีละไฟล์กันข้อมูลชนกัน
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});

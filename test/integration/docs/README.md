# Integration Tests

Документация integration-контура разделена по назначению.

## Для владельцев инфраструктуры

[architecture.md](./architecture.md) описывает:

- устройство PostgreSQL Testcontainers;
- lifecycle Jest;
- template database и database-per-worker;
- применение Prisma migrations;
- очистку данных и safety checks;
- CI и диагностику infrastructure failures.

Этот документ нужен при изменении setup-файлов, Jest configuration, Prisma schema
или стратегии изоляции.

## Для разработчиков

[writing-tests.md](./writing-tests.md) описывает:

- когда нужен integration-тест;
- где размещать новый spec;
- как выбрать границу теста;
- как собирать Nest module с настоящим `PrismaService`;
- как создавать test data;
- как структурировать test cases;
- какие практики и anti-patterns приняты в проекте.

Если задача — добавить новый integration-тест для feature, начинайте с
`writing-tests.md`.

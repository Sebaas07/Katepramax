const { buildApp } = require("../src/app");

let app;

beforeAll(async () => {
  // Inicializamos la app sin levantar puertos reales
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  // Cerramos la instancia de Fastify de forma limpia al terminar
  await app.close();
});

describe("GET /salud", () => {
  it("Debería responder un estado 200 y el estatus OK", async () => {
    // Inyectamos la petición directamente a Fastify de forma virtual
    const response = await app.inject({
      method: "GET",
      url: "/salud",
    });

    expect(response.statusCode).toBe(200);

    const payload = JSON.parse(response.payload);
    expect(payload.status).toBe("ok");
    expect(payload).toHaveProperty("timestamp");
  });
});

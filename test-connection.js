// test-connection.js
async function testConnection() {
  try {
    console.log("Intentando conectar con el host de Supabase Auth...");
    const response = await fetch("https://qazrjmkfbjgdjfvfylqx.supabase.co");
    console.log("¡Éxito! La conexión funciona.");
    console.log("Estado de la respuesta:", response.status);
  } catch (error) {
    console.error("¡Falló la conexión desde Node.js!");
    console.error(error);
  }
}

testConnection();

import express from "express";
import { identifyRouter } from "./routes/identify";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/", identifyRouter);

app.listen(PORT, () => {
  console.log(`Service running on port ${PORT}`);
});

export default app;

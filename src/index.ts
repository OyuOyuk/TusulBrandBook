import 'dotenv/config';
import cors from "cors"
import helmet from 'helmet';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import express from "express";
import router from "./routes/index.js";

const app = express();
const PORT = process.env.PORT ?? 3000;
const corsOptions = {
    origin: 'http://localhost:3000'
}
app.use(cors(corsOptions))
app.use(helmet())
app.use(morgan("combined"))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
app.use("/api", router);

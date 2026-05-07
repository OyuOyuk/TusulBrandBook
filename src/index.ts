import 'dotenv/config';
import cors from "cors"
import helmet from 'helmet';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import express from "express";
import router from "./routes/index.js";

const app = express();
const PORT = Number(process.env.PORT) || 8080;
const corsOptions = {
    origin: ['http://localhost:5173', 'https://app.oyutechnology.com', 'https://www.oyutechnology.com']
}
app.use(cors(corsOptions))
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan("combined"))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.use("/api", router);
app.listen(PORT,'0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`)
})
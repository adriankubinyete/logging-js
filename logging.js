import 'dotenv/config';
import { logging } from './src/utils/logging.js';
import express from 'express';
import cors from 'cors';
import { setLogPrefix } from './src/middlewares/Utility.js';

import getRouter from './src/routes/index.js';

const api_logger = logging.getLogger('api');
const transport_console = new logging.transports.Console()
const transport_file = new logging.transports.FileRotate({
    filename: './logs/runtime-%DATE%.log',
    maxSize: '20m',
    maxFiles: '14d',
})

api_logger.addTransport(transport_console);
api_logger.addTransport(transport_file);
api_logger.setLevel('unit')

const app = express();
app.use(cors());
app.use(express.json());
app.use(setLogPrefix)
app.use('/api', getRouter());

if (process.env.NODE_ENV !== 'test') {
    app.listen(process.env.EXPRESS_PORT, () => {
        api_logger.info(`Server is running on port ${process.env.EXPRESS_PORT}`);
    });
}

export default app; // export so it can be used as test
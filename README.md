
# logging-js

This project aims to bring a similar logging method as python's logging to NodeJS.
I could not find something like that, so I made it myself.

This is beyond a perfect clone of python's logging module, but it mimics the behaviours I need, so I am satisfied with it.

*PS: This was made on NodeJS v20.16.0, using winston v3.17.0 and winston-daily-rotate-file v5.0.0. Module exporting methods ("type": "module")*

# Usage

This "module" of sorts depends on winston to work. You will need to add the following packages to your application:

```bash
npm i winston winston-daily-rotate-file
```

Winston is the base used to do the logging, and winston-daily-rotate-file is used to create a rotating file transport for our log.

---

On your entry point file, import our logging class, and setup your log root. Then, define the desired transport for said root:

```js
import { logging } from 'logging.js'

const base_logger = logging.getLogger('base')

const console_transport = logging.transports.Console()
const file_rotate_transport = logging.transports.FileRotate({
    filename: 'logs/test-%DATE%.log',
    maxSize: '20m',
    maxFiles: 14,
})

base_logger.setLevel('trace')

base_logger.addTransport(console_transport)
base_logger.addTransport(file_rotate_transport)

base_logger.unit('this is unit')
base_logger.trace('this is trace')
base_logger.debug('this is debug')
base_logger.info('this is info')
base_logger.warn('this is warn')
base_logger.error('this is error')
base_logger.critical('this is critical')
```

You do not need to export "base_logger" anywhere. Assuming you set up your root log ("base" in this case) at your entry point, every place that has a children of root, and utilizes our logging **__after__** we defined the transport, will be registered/logged to our set transport.

# A better example

Imagine the following file structure:
```txt
entry.js
lib/logging.js
lib/do_something.js
lib/do_something_else.js
```
Where:

```js
> lib/do_something.js
import { logging } from './logging.js'

const logger = logging.getLogger('base.work.something')

export const something = () => {
    logger.info('we are doing something')
    logger.warn('we are doing something')
}
```

```js
> lib/do_something_else.js
import { logging } from './logging.js'

const logger = logging.getLogger('something.somethingelse')

export const something_else = () => {
    logger.info('we are doing something else')
    logger.warn('we are doing something else')
}
```

On your entry point, your setup is:
```js
> entry.js
import { logging } from './lib/logging.js'
import { something } from './lib/do_something.js'
import { something_else } from './lib/do_something_else.js'

// get the root of "base"
const base = logging.getLogger('base')

// tell it that everything from that root foward needs to be sent to both transports (console and file)
const console_t = new logging.transports.Console()
const file_t = new logging.transports.FIleRotate({
    filename: "./logs/test-%DATE%.log",
    maxSize: "20m",
    maxFiles: 14
})
base.addTransport(console_t)
base.addTransport(file_t)

// if we call the file's func, it should log us whatever is on that
something()
// [2024-12-17 08:57:XX.XXX] [INFO    ] base.work.something: we are doing something
// [2024-12-17 08:57:XX.XXX] [WARN    ] base.work.something: we are doing something

// but if we call the other file's func, it wont log anything, because it is not rooted from "base", but from "something"
something_else()
// <wont return anything>

// we can make it return something by registering a transport to it

const something_logger = logging.getLogger('something') // we want the "something" root
something_logger.addTransport(console_t)
something_logger.addTransport(file_t)

// now that it has a transport, if we call it again, it should log us what we want
something_else()
// [2024-12-17 08:57:XX.XXX] [INFO    ] something.somethingelse: we are doing something else
// [2024-12-17 08:57:XX.XXX] [WARN    ] something.somethingelse: we are doing something else


//ps: ignore the "XX" in timestamps
```

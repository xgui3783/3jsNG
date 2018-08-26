const express = require('express')
const app = express()
const PORT = process.env.PORT || 3010



app.listen(PORT, () => console.log(`app listening on port ${PORT}`))
# Solution Documentation for Spencer's Interview

To run this Task Management API, follow the steps below:

## Prerequisites

- Node.js (version 14.x or higher)
- npm (Node Package Manager)

### Steps to Run

1. Clone the repository

```bash
git clone <repository-url/spencers_interview>
cd interview
```

2. Install dependencies

```bash
npm install
```

3. Start the development server

```bash
npm run dev
```

4. Run tests

```bash
npm test
```

### Overview

Going in, I believed I would mostly be creating from scratch. Once I ran the tests and fixed the ones that were breaking, I found that most of the requirements had been accomplished. I built tests to test for every other requirement listed, and almost all of them except for the bonus requirements were passing. I ended up getting completely stuck on the batch update, but got everything else done. 

### Assumptions

I believe the only real assumption I made outside the instructions given was the rate-limit being set to 100 requests within 15 minutes, it's very likely you would prefer that to be lower.

### Wrap-up

I chose getting things working over them looking pretty, some tests took me forever to hunt down what was breaking it. In particular I think about the get:/id and put:/id routes, where I ended up putting the code in the routes file. For the put especially, this was due to a difficult to track down async unresolved promise error when I put the logic in the controller. With more time, I would finish the batch updates requirement, and then work on offloading everything into the controllers, to keep the routes file very clean and minimal. To scale the API, first step would of course be to not have everything be in memory, to use a RDS. We would also want to add user authentication, a more detailed search, and caching for popular requests. To scale, we could take those and put them on Heroku and scale up the instances. Thank you very much, please let me know if you have any further questions for me!

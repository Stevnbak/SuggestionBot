FROM oven/bun:1 AS base

# Bun install
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev
RUN cd /temp/dev && bun install --frozen-lockfile
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Build
FROM base AS prerelease
RUN "git clone https://github.com/Stevnbak/SuggestionBot.git"
COPY --from=install /temp/dev/node_modules node_modules
ENV NODE_ENV=production
ENV TOKEN=NTU3MzAzOTI1MzA5NTcxMDk4.Gq0fVw.6OIXXUadCCzsefdqDMn62-SplB3ylXEmojXtf0
ENV CLIENT_ID=557303925309571098
ENV MONGO_DB=mongodb+srv://admin:AtkhvO6F2QEHwARK@personalcluster.mhfv87c.mongodb.net/?retryWrites=true&w=majority
RUN bun run Build

# Make final image
FROM base AS release
COPY --from=install  /temp/prod/suggestionbot/node_modules node_modules
COPY --from=prerelease ./build .




VOLUME "/logs"
# Build from repo root (Railway: Root Directory = /, Dockerfile Path = CarPilot.Server/Dockerfile)

FROM node:22-bookworm-slim AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY CarPilot.Server/CarPilot.Server.csproj CarPilot.Server/
RUN dotnet restore CarPilot.Server/CarPilot.Server.csproj
COPY CarPilot.Server/ CarPilot.Server/
COPY --from=frontend /src/frontend/dist/ CarPilot.Server/wwwroot/
RUN dotnet publish CarPilot.Server/CarPilot.Server.csproj -c Release -o /app/out

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/out .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "CarPilot.Server.dll"]

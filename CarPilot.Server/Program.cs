using CarPilot.Server.Repositories;
using CarPilot.Server.Services;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add services to the container.
builder.Services.AddProblemDetails();
builder.Services.AddControllers();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Garage storage is in process memory for now, so it has to outlive the request.
builder.Services.AddSingleton<IGarageRepository, InMemoryGarageRepository>();
builder.Services.AddScoped<IGarageService, GarageService>();
builder.Services.AddScoped<IAssistantService, AssistantService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();

app.MapDefaultEndpoints();

app.UseFileServer();

app.Run();

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace CarCare.Maintenance.Persistence;

// Nullable columns preserve the meaning of historical records whose costs/dates are unknown.
public static class CostSchemaUpgrade
{
    public static async Task ApplyAsync(MaintenanceDbContext db)
    {
        await db.Database.OpenConnectionAsync();
        try
        {
            await using var transaction = await db.Database.BeginTransactionAsync();
            foreach (
                var (table, columns) in new[]
                {
                    ("ServiceRecords", new[] { "ServiceDate", "TotalCost", "Category" }),
                    ("FuelEntries", new[] { "TotalCost", "FueledOn" }),
                }
            )
            {
                var existing = new HashSet<string>();
                await using (var command = db.Database.GetDbConnection().CreateCommand())
                {
                    command.Transaction = transaction.GetDbTransaction();
                    command.CommandText = $"PRAGMA table_info(\"{table}\")";
                    await using var reader = await command.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                        existing.Add(reader.GetString(1));
                }
                foreach (var column in columns)
                    if (!existing.Contains(column))
                    {
                        // Identifiers come exclusively from the fixed schema list above.
                        await using var alter = db.Database.GetDbConnection().CreateCommand();
                        alter.Transaction = transaction.GetDbTransaction();
                        alter.CommandText =
                            $"ALTER TABLE \"{table}\" ADD COLUMN \"{column}\" TEXT NULL";
                        await alter.ExecuteNonQueryAsync();
                    }
            }
            await transaction.CommitAsync();
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }
}

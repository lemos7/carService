using System.Globalization;
using CarCare.Maintenance.Application;
using CarCare.Maintenance.Domain;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CarCare.Maintenance.Api;

public sealed class VehicleReportPdfRenderer : IVehicleReportRenderer
{
    private static readonly CultureInfo Culture = CultureInfo.GetCultureInfo("pt-BR");
    private const string Primary = "1F4B43";
    private const string Light = "E9F3F0";

    public byte[] Render(VehicleReportModel report) =>
        Document
            .Create(document =>
            {
                document.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(32);
                    page.DefaultTextStyle(x => x.FontSize(9).FontColor(Colors.Grey.Darken3));
                    page.Header().Element(c => Header(c, report));
                    page.Content().PaddingVertical(18).Column(column =>
                    {
                        column.Spacing(16);
                        column.Item().Element(c => Vehicle(c, report));
                        column.Item().Element(c => Summary(c, report));
                        column.Item().Element(c => CategoryCosts(c, report));
                        column.Item().Element(c => Fuel(c, report.FuelEntries));
                        column.Item().Element(c => Services(c, report.ServiceRecords));
                        column.Item().Element(c => Maintenance(c, report));
                        if (
                            report.Summary.OmittedFuelEntries > 0
                            || report.Summary.OmittedServiceRecords > 0
                        )
                            column
                                .Item()
                                .Background(Colors.Orange.Lighten4)
                                .Padding(10)
                                .Text(
                                    $"Dados incompletos: {report.Summary.OmittedFuelEntries} abastecimento(s) e "
                                        + $"{report.Summary.OmittedServiceRecords} manutenção(ões) foram preservados no histórico, "
                                        + "mas omitidos dos cálculos por falta de informações necessárias."
                                );
                    });
                    page.Footer().AlignCenter().Text(text =>
                    {
                        text.Span("CarCare • Página ");
                        text.CurrentPageNumber();
                        text.Span(" de ");
                        text.TotalPages();
                    });
                });
            })
            .GeneratePdf();

    private static void Header(IContainer container, VehicleReportModel report)
    {
        container.Row(row =>
        {
            row.RelativeItem().Column(column =>
            {
                column.Item().Text("Relatório do veículo").FontSize(20).Bold().FontColor(Primary);
                column.Item().Text($"{report.Vehicle.Model} • {report.Vehicle.LicensePlate}");
            });
            row.ConstantItem(180).AlignRight().Column(column =>
            {
                column.Item().AlignRight().Text($"Gerado em {LocalDate(report.GeneratedAtUtc):dd/MM/yyyy HH:mm}");
                column
                    .Item()
                    .AlignRight()
                    .Text(
                        report.Period.StartDate.HasValue
                            ? $"Período: {report.Period.StartDate:dd/MM/yyyy} a {report.Period.EndDate:dd/MM/yyyy}"
                            : "Período: histórico completo"
                    );
            });
        });
    }

    private static void Vehicle(IContainer container, VehicleReportModel report)
    {
        container.Background(Light).Padding(14).Row(row =>
        {
            if (IsSupportedImage(report.Vehicle.Photo))
                row.ConstantItem(115).Height(78).PaddingRight(14).Image(report.Vehicle.Photo!).FitArea();
            row.RelativeItem().Column(column =>
            {
                column.Item().Text("Dados do veículo").FontSize(13).Bold().FontColor(Primary);
                column.Item().PaddingTop(6).Text($"Modelo: {report.Vehicle.Model}");
                column.Item().Text($"Ano: {report.Vehicle.Year}  •  Placa: {report.Vehicle.LicensePlate}");
                column.Item().Text($"Cor: {report.Vehicle.Color}  •  Motor: {report.Vehicle.Engine}");
                column.Item().Text($"Quilometragem atual: {report.Vehicle.OdometerKm:N0} km");
            });
        });
    }

    private static void Summary(IContainer container, VehicleReportModel report)
    {
        var s = report.Summary;
        container.Column(column =>
        {
            column.Item().Element(c => SectionTitle(c, "Resumo de custos e consumo"));
            column.Item().PaddingTop(8).Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                });
                Metric(table, "Combustível", Money(s.FuelCost));
                Metric(table, "Manutenção", Money(s.MaintenanceCost));
                Metric(table, "Total geral", Money(s.TotalCost));
                Metric(table, "Distância", $"{s.DistanceKm:N0} km");
                Metric(table, "Litros", $"{s.Liters:N2} L");
                Metric(table, "Consumo médio", Number(s.AverageKmPerLiter, "km/l"));
                Metric(table, "Preço médio", Money(s.AveragePricePerLiter, "/l"));
                Metric(table, "Custo por km", Money(s.FuelCostPerKm, "/km"));
            });
        });
    }

    private static void Metric(TableDescriptor table, string label, string value) =>
        table.Cell().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(8).Column(column =>
        {
            column.Item().Text(label).FontSize(8).FontColor(Colors.Grey.Darken1);
            column.Item().Text(value).Bold().FontSize(11).FontColor(Primary);
        });

    private static void CategoryCosts(IContainer container, VehicleReportModel report)
    {
        container.Column(column =>
        {
            column.Item().Element(c => SectionTitle(c, "Custos de manutenção por categoria"));
            if (report.Summary.MaintenanceByCategory.Count == 0)
                column.Item().PaddingTop(6).Text("Não há custos de manutenção no período.").Italic();
            else
                column.Item().PaddingTop(6).Element(c => TwoColumnTable(
                    c,
                    "Categoria",
                    "Valor",
                    report.Summary.MaintenanceByCategory.Select(x => (x.Category, Money(x.Total)))
                ));
        });
    }

    private static void Fuel(IContainer container, IReadOnlyList<FuelEntry> entries)
    {
        container.Column(column =>
        {
            column.Item().Element(c => SectionTitle(c, "Abastecimentos"));
            if (entries.Count == 0)
            {
                column.Item().PaddingTop(6).Text("Não há abastecimentos registrados.").Italic();
                return;
            }
            column.Item().PaddingTop(6).Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(72);
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                });
                HeaderCell(table, "Data");
                HeaderCell(table, "Km anterior");
                HeaderCell(table, "Km atual");
                HeaderCell(table, "Litros");
                HeaderCell(table, "Valor");
                foreach (var item in entries)
                {
                    Cell(table, item.FueledOn?.ToString("dd/MM/yyyy") ?? "Não informado");
                    Cell(table, item.PreviousOdometerKm?.ToString("N0", Culture) ?? "Não informado");
                    Cell(table, item.OdometerKm.ToString("N0", Culture));
                    Cell(table, item.Liters.ToString("N2", Culture));
                    Cell(table, item.TotalCost.HasValue ? Money(item.TotalCost.Value) : "Não informado");
                }
            });
        });
    }

    private static void Services(IContainer container, IReadOnlyList<ServiceRecord> records)
    {
        container.Column(column =>
        {
            column.Item().Element(c => SectionTitle(c, "Manutenções realizadas"));
            if (records.Count == 0)
            {
                column.Item().PaddingTop(6).Text("Não há manutenções realizadas registradas.").Italic();
                return;
            }
            foreach (var item in records)
                column.Item().PaddingTop(7).BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingBottom(7).Column(card =>
                {
                    card.Item().Text(text =>
                    {
                        text.Span(item.ServiceDate?.ToString("dd/MM/yyyy") ?? "Data não informada").Bold();
                        text.Span($" • {item.Category ?? "Sem categoria"} • {item.OdometerKm:N0} km");
                        text.Span($" • {(item.TotalCost.HasValue ? Money(item.TotalCost.Value) : "Valor não informado")}").Bold();
                    });
                    card.Item().Text(string.IsNullOrWhiteSpace(item.Details) ? "Sem descrição." : item.Details);
                    card.Item().Text(
                        string.IsNullOrWhiteSpace(item.DocumentName)
                            ? "Comprovante: não anexado"
                            : $"Comprovante: {item.DocumentName}"
                    ).FontSize(8);
                });
        });
    }

    private static void Maintenance(IContainer container, VehicleReportModel report)
    {
        container.Column(column =>
        {
            column.Item().Element(c => SectionTitle(c, "Lembretes de manutenção"));
            if (report.MaintenanceItems.Count == 0)
            {
                column.Item().PaddingTop(6).Text("Não há lembretes de manutenção registrados.").Italic();
                return;
            }
            column.Item().PaddingTop(6).Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(2);
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                });
                HeaderCell(table, "Título");
                HeaderCell(table, "Vencimento");
                HeaderCell(table, "Recorrência");
                HeaderCell(table, "Estado");
                foreach (var item in report.MaintenanceItems)
                {
                    Cell(table, item.Title);
                    Cell(table, $"{item.DueKm:N0} km (aviso {item.WarningKm:N0} km antes)");
                    Cell(table, item.RepeatEveryKm is > 0 ? $"{item.RepeatEveryKm:N0} km" : "Não recorrente");
                    Cell(table, MaintenanceStatus(item, report.Vehicle.OdometerKm));
                }
            });
        });
    }

    private static string MaintenanceStatus(MaintenanceItem item, int currentKm)
    {
        if (item.CompletedAtUtc.HasValue)
            return $"Concluída em {item.CompletedAtKm:N0} km";
        if (currentKm >= item.DueKm)
            return "Vencida";
        if (currentKm >= item.DueKm - item.WarningKm)
            return "Próxima";
        return "Pendente";
    }

    private static void SectionTitle(IContainer container, string title) =>
        container.BorderBottom(2).BorderColor(Primary).PaddingBottom(4).Text(title).FontSize(13).Bold().FontColor(Primary);

    private static void HeaderCell(TableDescriptor table, string value) =>
        table.Cell().Background(Primary).Padding(5).Text(value).FontColor(Colors.White).Bold();

    private static void Cell(TableDescriptor table, string value) =>
        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(5).Text(value);

    private static void TwoColumnTable(
        IContainer container,
        string firstHeader,
        string secondHeader,
        IEnumerable<(string First, string Second)> rows
    ) => container.Table(table =>
    {
        table.ColumnsDefinition(columns =>
        {
            columns.RelativeColumn();
            columns.RelativeColumn();
        });
        HeaderCell(table, firstHeader);
        HeaderCell(table, secondHeader);
        foreach (var row in rows)
        {
            Cell(table, row.First);
            Cell(table, row.Second);
        }
    });

    private static bool IsSupportedImage(byte[]? data) =>
        data is { Length: > 11 }
        && (
            data.AsSpan(0, 3).SequenceEqual(new byte[] { 0xFF, 0xD8, 0xFF })
            || data.AsSpan(0, 8).SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A })
            || (System.Text.Encoding.ASCII.GetString(data, 0, 4) == "RIFF"
                && System.Text.Encoding.ASCII.GetString(data, 8, 4) == "WEBP")
        );

    private static string Money(decimal value) => value.ToString("C2", Culture);
    private static string Money(decimal? value, string suffix) =>
        value.HasValue ? Money(value.Value) + suffix : "Não disponível";
    private static string Number(decimal? value, string suffix) =>
        value.HasValue ? value.Value.ToString("N2", Culture) + " " + suffix : "Não disponível";
    private static DateTime LocalDate(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.SpecifyKind(utc, DateTimeKind.Utc),
            GetReportTimeZone()
        );
    private static TimeZoneInfo GetReportTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById("E. South America Standard Time");
        }
    }
}

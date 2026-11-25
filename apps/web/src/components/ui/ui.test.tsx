import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, type Column } from "@/components/ui/table";

describe("componentes de interface", () => {
  it("marca o botão como ocupado e impede novo clique", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Salvando…
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Salvando…" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("associa label, erro e estado inválido no campo", () => {
    render(<Input label="E-mail" error="Informe um e-mail válido." defaultValue="" />);
    const field = screen.getByLabelText("E-mail");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Informe um e-mail válido.");
  });

  it("associa o select ao rótulo e mostra o erro", () => {
    render(
      <Select label="Papel" error="Escolha um papel." defaultValue="">
        <option value="">Selecione</option>
        <option value="CAIXA">Caixa</option>
      </Select>,
    );
    expect(screen.getByLabelText("Papel")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Escolha um papel.");
  });

  it("alterna o checkbox pelo rótulo e anuncia o erro", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [checked, setChecked] = useState(false);
      return <Checkbox label="Confirmo a desativação" checked={checked} onCheckedChange={setChecked} error="Confirme para continuar." />;
    }
    render(<Harness />);
    await user.click(screen.getByLabelText("Confirmo a desativação"));
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Confirme para continuar.");
  });

  it("renderiza a tabela e os cartões com o mesmo conteúdo", () => {
    const columns: Column<{ id: string; name: string }>[] = [
      { key: "name", header: "Nome", cell: (row) => row.name },
    ];
    render(
      <Table
        columns={columns}
        data={[{ id: "1", name: "Ana Silva" }]}
        rowKey={(row) => row.id}
        caption="Usuários da empresa"
        empty="Nenhum usuário"
      />,
    );
    expect(screen.getByRole("table", { name: "Usuários da empresa" })).toBeInTheDocument();
    expect(screen.getAllByText("Ana Silva")).toHaveLength(2);
  });

  it("mostra o estado vazio", () => {
    render(
      <Table
        columns={[{ key: "name", header: "Nome", cell: () => null }]}
        data={[]}
        rowKey={() => "x"}
        caption="Usuários da empresa"
        empty="Nenhum usuário encontrado"
      />,
    );
    expect(screen.getAllByText("Nenhum usuário encontrado").length).toBeGreaterThan(0);
  });

  it("abre o diálogo com título e fecha pelo botão", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Desativar usuário" description="A pessoa perde o acesso.">
        <p>Confira antes de continuar.</p>
      </Dialog>,
    );
    expect(screen.getByRole("dialog", { name: "Desativar usuário" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

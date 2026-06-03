use anchor_lang::prelude::*;

declare_id!("Gqo5WJ92Ja8G4hsvLA8QKbJcaEB8CBmEnZE5wyQruewa");

#[program]
pub mod sol_lending {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}


CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_company_id UUID;
BEGIN
  -- Skip company creation for team members (added via create-team-member)
  IF (NEW.raw_user_meta_data->>'is_team_member')::boolean = true THEN
    RETURN NEW;
  END IF;

  -- Create a new company for the user
  INSERT INTO public.companies (name, owner_uid)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa'), NEW.id)
  RETURNING id INTO new_company_id;
  
  -- Link user to the company as owner
  INSERT INTO public.company_users (user_id, company_id, role)
  VALUES (NEW.id, new_company_id, 'owner');
  
  RETURN NEW;
END;
$function$;
